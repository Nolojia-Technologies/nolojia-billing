"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DateTimePickerProps {
    date: Date | undefined
    setDate: (date: Date | undefined) => void
    showTime?: boolean
    placeholder?: string
    className?: string
    disabled?: boolean
}

export function DateTimePicker({
    date,
    setDate,
    showTime = true,
    placeholder = "Pick date & time",
    className,
    disabled = false,
}: DateTimePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false)

    // Handle time change
    const handleTimeChange = (type: "hours" | "minutes", value: string) => {
        if (!date) {
            const newDate = new Date()
            if (type === "hours") {
                newDate.setHours(parseInt(value) || 0)
            } else {
                newDate.setMinutes(parseInt(value) || 0)
            }
            setDate(newDate)
            return
        }

        const newDate = new Date(date)
        if (type === "hours") {
            newDate.setHours(parseInt(value) || 0)
        } else {
            newDate.setMinutes(parseInt(value) || 0)
        }
        setDate(newDate)
    }

    // Handle date selection from calendar
    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (!selectedDate) {
            setDate(undefined)
            return
        }

        // Preserve time if already set
        if (date) {
            selectedDate.setHours(date.getHours())
            selectedDate.setMinutes(date.getMinutes())
        }
        setDate(selectedDate)
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? (
                        showTime
                            ? format(date, "PPP 'at' HH:mm")
                            : format(date, "PPP")
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    initialFocus
                />
                {showTime && (
                    <div className="border-t p-3">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-sm font-medium">Time</Label>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <Input
                                type="number"
                                min={0}
                                max={23}
                                placeholder="HH"
                                className="w-16 text-center"
                                value={date ? date.getHours().toString().padStart(2, '0') : ''}
                                onChange={(e) => handleTimeChange("hours", e.target.value)}
                            />
                            <span className="text-lg font-bold">:</span>
                            <Input
                                type="number"
                                min={0}
                                max={59}
                                placeholder="MM"
                                className="w-16 text-center"
                                value={date ? date.getMinutes().toString().padStart(2, '0') : ''}
                                onChange={(e) => handleTimeChange("minutes", e.target.value)}
                            />
                        </div>
                        <div className="flex gap-1 mt-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                    const now = new Date()
                                    if (date) {
                                        date.setHours(now.getHours())
                                        date.setMinutes(now.getMinutes())
                                        setDate(new Date(date))
                                    } else {
                                        setDate(now)
                                    }
                                }}
                            >
                                Now
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                    if (date) {
                                        date.setHours(23)
                                        date.setMinutes(59)
                                        setDate(new Date(date))
                                    }
                                }}
                            >
                                23:59
                            </Button>
                        </div>
                    </div>
                )}
                <div className="border-t p-3 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setDate(undefined)}>
                        Clear
                    </Button>
                    <Button size="sm" onClick={() => setIsOpen(false)}>
                        Done
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

// Simple date picker without time
export function DatePicker({
    date,
    setDate,
    placeholder = "Pick a date",
    className,
    disabled = false,
}: Omit<DateTimePickerProps, 'showTime'>) {
    return (
        <DateTimePicker
            date={date}
            setDate={setDate}
            showTime={false}
            placeholder={placeholder}
            className={className}
            disabled={disabled}
        />
    )
}
